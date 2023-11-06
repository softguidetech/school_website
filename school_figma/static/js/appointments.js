odoo.define('lapalma_website.website_create_new_appointment', function (require) {
    'use strict';

    var publicWidget = require('web.public.widget');
    var ajax = require('web.ajax');

    var current_fs, next_fs, previous_fs;
    var left, opacity, scale;
    var animating = false;

    $(".next").click(function (event) {
        event.preventDefault();  // Add this line

        if (animating) return false;
        animating = true;

        current_fs = $(this).closest("fieldset");
        next_fs = $(this).closest("fieldset").next("fieldset");

        // Assuming you have a progress bar with id 'progressbar'
        $("#progressbar li").eq($("fieldset").index(next_fs)).addClass("active");

        next_fs.show();

        current_fs.animate({opacity: 0}, {
            step: function (now, mx) {
                scale = 1 - (1 - now) * 0.2;
                left = (now * 50) + "%";
                opacity = 1 - now;
                current_fs.css({'transform': 'scale(' + scale + ')', 'position': 'absolute'});
                next_fs.css({'left': left, 'opacity': opacity});
            },
            duration: 80,
            complete: function () {
                current_fs.hide();
                animating = false;
            },
            easing: 'easeInOutBack'
        });
    });
    $(".previous").click(function (event) { // Include 'event' here
        event.preventDefault();  // Add this line

        if (animating) return false;
        animating = true;

        current_fs = $(this).closest("fieldset");  // Changed from .parent() to closest('fieldset')
        previous_fs = $(this).closest("fieldset").prev("fieldset"); // Changed from .parent().prev() to closest('fieldset').prev('fieldset')

        // De-activate current step on progressbar
        $("#progressbar li").eq($("fieldset").index(current_fs)).removeClass("active");

        // Show the previous fieldset
        previous_fs.show();

        // Hide the current fieldset with style
        current_fs.animate({opacity: 0}, {
            step: function (now, mx) {
                scale = 0.8 + (1 - now) * 0.2;
                left = ((1 - now) * 50) + "%";
                opacity = 1 - now;
                current_fs.css({'left': left});
                previous_fs.css({'transform': 'scale(' + scale + ')', 'opacity': opacity, 'position': 'relative'});
            },
            duration: 800,
            complete: function () {
                current_fs.hide();
                animating = false;
            },
            easing: 'easeInOutBack'
        });
    });


    publicWidget.registry.WebsiteCreateNewAppointment = publicWidget.Widget.extend({
        selector: '#msform',


        events: {
            'click .category-btn': '_onCategoryButtonClick',
            'input #live-search': '_onLiveSearch',
            'click .product-box': '_onProductClick',
            'click .select-services-product': '_preventDefaultButtons',
            'click .coiffure-box': '_onCoiffureClick',
            'click #prev-week': '_onClickPrevWeek',
            'click #next-week': '_onClickNextWeek',
            'click .time-slot': '_onTimeSlotClick',


        },

        start: function () {
            this._super.apply(this, arguments);
            this.selectedProducts = [];
            this.selectedCoiffures = [];
            this.days_of_week = [];
            this.coiffure_id = null;
            this.currentYear = new Date().getFullYear();

            this._updateSelectedProductsContainer();
            this._loadDaysOfWeek();
        },

        selectedDate: null,
        selectedDay: null,
        selectedTime: null,

        _onTimeSlotClick: function (event) {
            var $target = $(event.currentTarget);

            // Extract clicked time
            var clickedTime = $target.text();

            if (this.selectedTime === clickedTime) {
                $target.removeClass('selected'); // unselect
                this.selectedTime = null; // remove selected time
            } else {
                $('.time-slot').removeClass('selected'); // unselect all
                $target.addClass('selected'); // select the clicked one
                this.selectedTime = clickedTime; // save selected time
            }
            this._updateSummary();

            console.log('selected Time', this.selectedTime);
        },
        _updateSummary: function () {
            var container = $('#summary-info');
            container.empty();

            var backButton = `
        <button class="previous" style="background-color: #FCD672!important;">
            <span class="back-icon">&#8592;</span> Back
        </button>
    `;
            container.append(backButton);

            // Add selected products first
            this.selectedProducts.forEach((product) => {
                let productButton = `
        <button type="button" class="select-services-product-co" data-id="${product.id}">
            ${product.name}
        </button>
    `;
                container.append(productButton);
            });

            // Add selected coiffures
            this.selectedCoiffures.forEach((coiffure) => {
                let coiffureName = "with " + coiffure.name;
                let coiffureButton = `
        <button type="button" class="select-services-product-co" data-id="${coiffure.id}">
            ${coiffureName}
        </button>
    `;
                container.append(coiffureButton);
            });

            // Add selected time
            if (this.selectedTime) {
                let timeButton = `
        <button type="button" class="select-services-product-co">
            ${this.selectedTime}
        </button>
    `;
                container.append(timeButton);
            }
        },


        // Function to generate days of the week given the start date
        _generateDaysOfWeek: function (start_date) {
            var days = [];
            var dateParts = start_date.split("-");
            var dateObject = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);

            for (var i = 0; i < 7; i++) {
                var newDate = new Date(dateObject);
                newDate.setDate(newDate.getDate() + i);
                var dayName = newDate.toLocaleString('default', {weekday: 'long'});
                var dayDate = newDate.getDate() + '/' + (newDate.getMonth() + 1);
                days.push({
                    'name': dayName,
                    'date': dayDate
                });
            }
            return days;
        },
        _loadDaysOfWeek: function () {
            var self = this;
            var today = new Date();
            var currSunday = new Date(today.setDate(today.getDate() - today.getDay()));
            var startDate = currSunday.getFullYear() + "-" + (currSunday.getMonth() + 1) + "-" + currSunday.getDate();
            self.days_of_week = self._generateDaysOfWeek(startDate);
            self._renderDaysOfWeek();
        },


        _renderDaysOfWeek: function () {
            var daysOfWeekHtml = '<div class="prev-weak-button">' +
                '<span class="fa fa-arrow-left" id="prev-week" style="color: black;"></span>' +
                '</div>';

            var today = new Date();
            var todayStr = today.getDate() + '/' + (today.getMonth() + 1); // Format it to day/month

            this.days_of_week.forEach(function (day) {
                var selectedClass = (day.date === todayStr) ? 'selected' : '';
                var formattedDate = day.date; // Assuming it's already in day/month format
                var shortName = day.name.substring(0, 3).toUpperCase();
                daysOfWeekHtml += `<div class="day-header ${selectedClass}">
        <span class="day-name">${shortName}</span><br/>
        <span class="day-date">${formattedDate}</span>
      </div>`;
            });

            daysOfWeekHtml += '<div class="next-weak-button">' +
                '<span class="fa fa-arrow-right" id="next-week" style="color: black;"></span>' +
                '</div>';

            this.$('.week-header').html(daysOfWeekHtml);
            this.$('.day-header').on('click', this._onClickDay.bind(this));
        },
        _onClickDay: function (event) {
            var $target = $(event.currentTarget);

            // Extract clicked day and month
            var clickedDateParts = $target.find('.day-date').text().split('/');
            var clickedDay = parseInt(clickedDateParts[0]);
            var clickedMonth = parseInt(clickedDateParts[1]);

            var today = new Date();
            var currentDay = today.getDate();
            var currentMonth = today.getMonth() + 1;
            var currentYear = today.getFullYear();

            if (clickedMonth < currentMonth || (clickedMonth === currentMonth && clickedDay < currentDay)) {
                return;
            }

            // Save selected date in mm/dd/yyyy format
            this.selectedDate = clickedMonth + '/' + clickedDay + '/' + currentYear;

            $('.day-header').removeClass('selected'); // unselect all
            $target.addClass('selected'); // select the clicked one
            this.selectedDay = $target.find('.day-name').text(); // save selected day
            console.log('selected Date', this.selectedDate)
            console.log('selected Day', this.selectedDay)
            var dayNameToNumberMap = {
                'MON': 0,
                'TUE': 1,
                'WED': 2,
                'THU': 3,
                'FRI': 4,
                'SAT': 5,
                'SUN': 6
            };

            var selectedDayNumber = dayNameToNumberMap[this.selectedDay.toUpperCase().substring(0, 3)];

            if (selectedDayNumber !== undefined) {
                this.selectedDay = selectedDayNumber;
                this._getSchedule(selectedDayNumber);
            }
        },


        _onClickPrevWeek: function () {
            var self = this;
            var firstDay = this.days_of_week[0].date;
            var dateParts = firstDay.split("/");
            var dateObject = new Date(this.currentYear, dateParts[1] - 1, dateParts[0]);
            dateObject.setDate(dateObject.getDate() - 7);
            var prevStartDate = dateObject.getFullYear() + "-" + (dateObject.getMonth() + 1) + "-" + dateObject.getDate();

            self.days_of_week = self._generateDaysOfWeek(prevStartDate);
            self._renderDaysOfWeek();
        },
        _onClickNextWeek: function () {
            var self = this;
            var lastDay = this.days_of_week[this.days_of_week.length - 1].date;
            var dateParts = lastDay.split("/");
            var dateObject = new Date(this.currentYear, dateParts[1] - 1, dateParts[0]);
            dateObject.setDate(dateObject.getDate() + 1);
            var nextStartDate = dateObject.getFullYear() + "-" + (dateObject.getMonth() + 1) + "-" + dateObject.getDate();

            self.days_of_week = self._generateDaysOfWeek(nextStartDate);
            self._renderDaysOfWeek();
        },


        _onCoiffureClick: function (event) {
            var $currentTarget = $(event.currentTarget);
            var $imgElement = $currentTarget.find('img'); // Find the img element
            var coiffureData = {
                id: $currentTarget.data('id'),
                name: $currentTarget.find('.coiffure-name').text(),
            };

            var index = this.selectedCoiffures.findIndex(coiffure => coiffure.id === coiffureData.id);

            if (index !== -1) {
                $imgElement.removeClass('selected'); // Remove class from img
                this.selectedCoiffures.splice(index, 1);
            } else {
                $imgElement.addClass('selected'); // Add class to img
                this.selectedCoiffures.push(coiffureData);
            }

            console.log("selected coiffures", this.selectedCoiffures);

            // Get today's day of the week
            var today = new Date();
            var day_of_week = today.getDay(); // 0 (Sunday) to 6 (Saturday)

            // Fetch today's schedule
            this._getSchedule(day_of_week);
            this._updateSelectedCoiffuresAndProductsContainer();  // Update the coiffures container

        },


        _updateSelectedCoiffuresAndProductsContainer: function () {
            var container = $('#selected-coiffures-and-products-container');
            container.empty();

            // Add selected products first
            this.selectedProducts.forEach((product) => {
                let productButton = `
            <button type="button" class="select-services-product-co" data-id="${product.id}">
                ${product.name}
            </button>
        `;
                container.append(productButton);
            });

            // Add selected coiffures
            this.selectedCoiffures.forEach((coiffure) => {
                let coiffureName = "with " + coiffure.name;
                let coiffureDiv = `
           <button type="button" class="select-services-product-co" data-id="${coiffure.id}">
                ${coiffureName}
            </button>
        `;

                container.append(coiffureDiv);
            });
        },

        _preventDefaultButtons: function (event) {
            event.preventDefault();
        },

        _onProductClick: function (event) {
            var $currentTarget = $(event.currentTarget);
            var productData = {
                id: $currentTarget.data('id'),
                name: $currentTarget.find('.product-name').text(),
            };

            var index = this.selectedProducts.findIndex(product => product.id === productData.id);

            if (index !== -1) {
                $currentTarget.removeClass('selected');
                this.selectedProducts.splice(index, 1);
                $currentTarget[0].offsetHeight; // force a repaint
            } else {
                $currentTarget.addClass('selected');
                this.selectedProducts.push(productData);
            }

            this._updateSelectedProductsContainer();
            this._fetchCoiffureData();

            console.log("selected", this.selectedProducts);
        },


        _updateSelectedProductsContainer: function () {
            var container = $('#selected-products-container');
            container.empty();

            this.selectedProducts.forEach((product) => {
                let productName = product.name;
                let productButton = `
        <button type="button" class="select-services-product" data-id="${product.id}">
            ${productName}
        </button>
    `;
                container.append(productButton);
            });
        },

        _getSchedule: function (day_of_week) {
            if (this.selectedCoiffures.length > 0 && day_of_week !== null) {
                var self = this;
                var coiffure_id = this.selectedCoiffures[0].id;

                ajax.jsonRpc("/odoo/rpc/for/schedule", 'call', {
                    'coiffure_id': coiffure_id,
                    'day_of_week': day_of_week
                }).then(function (result) {
                    var scheduleHtml = '';
                    for (var i = 0; i < result.length; i++) {
                        scheduleHtml += '<div class="time-slot">' + result[i]['time_range'] + '</div>';
                    }
                    self.$('.time-slots-container').html(scheduleHtml);
                });
            }
            this.$('.time-slot').on('click', this._onTimeSlotClick.bind(this));
        },

        _onCategoryButtonClick: function (event) {
            var $currentTarget = $(event.currentTarget);
            if ($currentTarget.hasClass('active')) {

                $currentTarget.removeClass('active');
                this._resetProducts();
            } else {
                // Otherwise, proceed as usual
                $('.category-btn').removeClass('active');
                $currentTarget.addClass('active');
                var categoryId = $currentTarget.data('id');
                this._getProductsByCategory(categoryId);
            }
        },


        _onLiveSearch: function (event) {
            var query = $(event.currentTarget).val();
            this._searchProducts(query);
        },

        _getProductsByCategory: function (categoryId) {
            var self = this;  // Keep context
            ajax.jsonRpc('/odoo/rpc/for/category', 'call', {
                'category_id': categoryId,
            }).then(function (products) {
                $('#product-container').empty();
                products.forEach(function (product) {
                    var isSelected = self.selectedProducts.some(p => p.id === product.id) ? ' selected' : '';
                    $('#product-container').append(`
        <div data-id="${product.id}" class="product-box fade-in${isSelected}">
            <div class="product-name">${product.name}</div>
            <div class="product-price">${product.list_price} ${product.currency_symbol}</div>
        </div>
    `);
                });
                $('.product-box').addClass('move-in');
            });
        },

        _searchProducts: function (query) {
            var self = this;  // Keep context
            ajax.jsonRpc('/odoo/rpc/for/search', 'call', {
                'query': query,
            }).then(function (products) {
                $('#product-container').empty();
                products.forEach(function (product) {
                    var isSelected = self.selectedProducts.some(p => p.id === product.id) ? ' selected' : '';
                    $('#product-container').append(`
        <div data-id="${product.id}" class="product-box fade-in${isSelected}">
            <div class="product-name">${product.name}</div>
            <div class="product-price">${product.list_price} ${product.currency_symbol}</div>
        </div>
    `);
                });
                $('.product-box').addClass('move-in');
            });
        },

        _resetProducts: function () {
            var self = this;  // Keep context
            ajax.jsonRpc('/odoo/rpc/for/product/reset', 'call', {}).then(function (products) {
                $('#product-container').empty();
                products.forEach(function (product) {
                    var isSelected = self.selectedProducts.some(p => p.id === product.id) ? ' selected' : '';
                    $('#product-container').append(`
        <div data-id="${product.id}" class="product-box fade-in${isSelected}">
            <div class="product-name">${product.name}</div>
            <div class="product-price">${product.list_price} ${product.currency_symbol}</div>
        </div>
    `);
                });
                $('.product-box').removeClass('move-in');
            });
        },


        _fetchCoiffureData: function () {
            var self = this;
            var selectedProductIds = this.selectedProducts.map(product => product.id);

            ajax.jsonRpc('/odoo/rpc/for/coiffure', 'call', {
                'product_ids': selectedProductIds
            }).then(function (coiffureData) {
                self._updateCoiffureContainer(coiffureData);
            });
        },

        _updateCoiffureContainer: function (coiffureData) {
            var container = $('#coiffure-container');
            container.empty();

            coiffureData.forEach((coiffure) => {
                var isSelected = this.selectedCoiffures.some(c => c.id === coiffure.id) ? ' selected' : '';
                var coiffureImage = `/coiffure/image/${coiffure.id}`;
                let coiffureElement = `
                <div data-id="${coiffure.id}" class="coiffure-box${isSelected}">
                    <img src="${coiffureImage}" alt="${coiffure.name}" />
                    <div class="coiffure-name">${coiffure.name}</div>
                </div>
            `;
                container.append(coiffureElement);
            });
        },


    });
});
